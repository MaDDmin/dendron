import {
  DEngineInitPayloadV2,
  DEngineMode,
  DEngineV2,
  DNodePropsV2,
  DNodeTypeV2,
  DStoreV2,
  EngineDeleteOptsV2,
  EngineUpdateNodesOptsV2,
  EngineWriteOptsV2,
  NotePropsV2,
  NoteUtilsV2,
  QueryOptsV2,
  RespV2,
  SchemaModulePropsV2,
  SchemaPropsV2,
} from "@dendronhq/common-all";
import { DLogger } from "@dendronhq/common-server";
import Fuse from "fuse.js";
import _ from "lodash";

type DendronEngineOptsV2 = {
  vaults: string[];
  forceNew?: boolean;
  store?: any;
  mode?: DEngineMode;
  logger?: DLogger;
};
type DendronEnginePropsV2 = Required<DendronEngineOptsV2>;

function createFuse<T>(
  initList: T[],
  opts: Fuse.IFuseOptions<any> & {
    exactMatch: boolean;
    preset: "schema" | "note";
  }
) {
  const options = {
    shouldSort: true,
    threshold: opts.exactMatch ? 0.0 : 0.6,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: ["title", "fname", "basename"],
    useExtendedSearch: true,
  };
  if (opts.preset === "schema") {
    options.keys = ["id", "title"];
  }
  const fuse = new Fuse(initList, options);
  return fuse;
}

export class DendronEngineV2 implements DEngineV2 {
  public vaults: string[];
  public store: DStoreV2;
  protected notesIndex: Fuse<NotePropsV2>;
  protected schemaIndex: Fuse<SchemaPropsV2>;
  protected props: DendronEnginePropsV2;
  public logger: DLogger;

  constructor(props: DendronEnginePropsV2) {
    this.vaults = props.vaults;
    this.store = props.store;
    this.notesIndex = createFuse<NotePropsV2>([], {
      exactMatch: props.mode === "exact",
      preset: "note",
    });
    this.schemaIndex = createFuse<SchemaPropsV2>([], {
      exactMatch: props.mode === "exact",
      preset: "schema",
    });
    this.logger = props.logger;
    this.props = props;
  }

  get notes() {
    return this.store.notes;
  }
  get schemas() {
    return this.store.schemas;
  }

  /**
   * Does not throw error but returns it
   */
  async init(): Promise<RespV2<DEngineInitPayloadV2>> {
    try {
      const { notes, schemas } = await this.store.init();
      this.updateIndex("note");
      this.updateIndex("schema");
      return {
        error: null,
        data: { notes, schemas },
      };
    } catch (error) {
      return {
        error,
        data: {},
      };
    }
  }

  async delete(
    _id: string,
    _mode: DNodeTypeV2,
    _opts?: EngineDeleteOptsV2
  ): Promise<void> {
    throw Error("to implement");
  }

  async query(
    queryString: string,
    mode: DNodeTypeV2,
    opts?: QueryOptsV2
  ): Promise<RespV2<DNodePropsV2[]>> {
    const ctx = "query";
    const cleanOpts = _.defaults(opts || {}, {
      fullNode: false,
      createIfNew: false,
      initialQuery: false,
      stub: false,
    });
    this.logger.info({ ctx, msg: "enter" });
    let items: DNodePropsV2[] = [];

    // ~~~ schema query
    if (mode === "schema") {
      if (queryString === "") {
        items = [this.schemas.root.root];
      } else if (queryString === "*") {
        items = _.values(this.schemas).map((ent) => ent.root);
      } else {
        const results = this.schemaIndex.search(queryString);
        items = _.map(results, (resp) => resp.item);
      }
    } else {
      // ~~~ note query
      if (queryString === "") {
        items = [this.notes.root];
      } else {
        const results = this.notesIndex.search(queryString);
        items = _.map(results, (resp) => resp.item);
      }
      if (cleanOpts.createIfNew) {
        let noteNew: NotePropsV2;
        if (items[0]?.fname === queryString && items[0]?.stub) {
          noteNew = items[0];
          noteNew.stub = false;
        } else {
          noteNew = NoteUtilsV2.create({ fname: queryString });
        }
        await this.writeNote(noteNew, { newNode: true });
      }
      if (cleanOpts.fullNode) {
        throw Error("not implemented");
      }
    }

    // ~~~ exit
    this.logger.info({ ctx, msg: "exit" });
    return {
      error: null,
      data: items,
    };
  }

  async updateNote(
    note: NotePropsV2,
    opts?: EngineUpdateNodesOptsV2
  ): Promise<void> {
    return this.store.updateNote(note, opts);
  }

  async updateIndex(mode: DNodeTypeV2) {
    if (mode === "schema") {
      this.schemaIndex.setCollection(
        _.map(_.values(this.schemas), (ent) => ent.root)
      );
    } else {
      this.notesIndex.setCollection(_.values(this.notes));
    }
  }

  async updateSchema(schemaModule: SchemaModulePropsV2) {
    return this.store.updateSchema(schemaModule);
  }

  async writeNote(note: NotePropsV2, opts?: EngineWriteOptsV2): Promise<void> {
    await this.store.writeNote(note, opts);
    await this.updateIndex("note");
  }

  async writeSchema(schema: SchemaModulePropsV2) {
    return this.store.writeSchema(schema);
  }
}
