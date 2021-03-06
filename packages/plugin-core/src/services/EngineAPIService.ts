import {
  DEngineClientV2,
  DEngineInitPayloadV2,
  DNodeData,
  DNodePropsV2,
  DNodeTypeV2,
  EngineDeleteOpts,
  EngineGetResp,
  EngineUpdateNodesOptsV2,
  EngineWriteOptsV2,
  IDNodeType,
  NotePropsDictV2,
  NotePropsV2,
  QueryMode,
  QueryOneOpts,
  QueryOpts,
  QueryOptsV2,
  RespV2,
  SchemaModuleDictV2,
  SchemaModulePropsV2,
} from "@dendronhq/common-all";
import { DendronAPI } from "@dendronhq/common-server";
import _ from "lodash";
import path from "path";
import { Logger } from "../logger";
import { DendronWorkspace } from "../workspace";

export class EngineAPIService implements DEngineClientV2 {
  public notes: NotePropsDictV2;
  public schemas: SchemaModuleDictV2;
  // public schemas: SchemaDict;
  // public props: Required<DEngineOpts>;
  // public initialized: boolean;
  // public store: DEngineStore;
  public ws: string;
  // public fullNodes: Set<string>;

  constructor(public api: DendronAPI) {
    this.notes = {};
    this.schemas = {};
    // this.fullNodes = new Set();
    // this.props = {} as any;
    // this.initialized = false;
    // this.store = {} as any;
    this.ws = path.dirname(DendronWorkspace.workspaceFile().fsPath);
  }

  /**
   * Load all nodes
   */
  async init(): Promise<RespV2<DEngineInitPayloadV2>> {
    const ctx = "EngineAPIService:init";
    Logger.info({ ctx, msg: "enter" });
    const vaults =
      DendronWorkspace.workspaceFolders()?.map((ent) => ent.uri.fsPath) || [];
    const resp = await this.api.workspaceInit({
      uri: this.ws,
      config: { vaults },
    });

    const { notes, schemas } = resp.data;
    this.notes = notes;
    this.schemas = schemas;
    Logger.info({ ctx, msg: "exit", resp });
    return resp;
  }

  async delete(
    _id: string,
    _mode: QueryMode,
    _opts?: EngineDeleteOpts
  ): Promise<void> {
    throw Error("not implemented");
  }

  /**
   * Get node based on id
   * get(id: ...)
   */
  async get(
    _id: string,
    _mode: QueryMode,
    _opts?: QueryOpts
  ): Promise<EngineGetResp<DNodeData>> {
    throw Error("not implemented");
  }

  // getBatch: (scope: Scope, ids: string[]) => Promise<NodeGetBatchResp>;

  /**
   * Get node based on query
   * query(scope: {username: lukesernau}, queryString: "project", nodeType: note)
   * - []
   * - [Node(id: ..., title: project, children: [])]
   */
  async query(
    queryString: string,
    mode: DNodeTypeV2,
    opts?: QueryOptsV2
  ): Promise<RespV2<DNodePropsV2[]>> {
    // TODO: look at cache
    const ctx = "query";
    const resp = await this.api.engineQuery({
      mode,
      queryString,
      opts,
      ws: this.ws,
    });
    await this.refreshNodes(resp.data, mode);
    Logger.info({ ctx, msg: "exit", resp });
    return resp;
  }

  /**
   * Shortcut Function
   */
  async queryOne(
    _queryString: string,
    _mode: QueryMode,
    _opts?: QueryOneOpts
  ): Promise<EngineGetResp<DNodeData>> {
    return {} as any;
  }

  async buildNotes() {}

  async refreshNodes(nodes: DNodePropsV2[], mode: IDNodeType) {
    if (_.isEmpty(nodes)) {
      return;
    }
    if (mode === "schema") {
      throw Error("not implemented schema refresh");
    } else {
      nodes.forEach((node: DNodePropsV2) => {
        const { id } = node;
        if (!_.has(this.notes, id)) {
          this.notes[id] = node;
        } else {
          _.merge(this.notes[id], node);
        }
      });
    }
  }

  async updateNote(
    note: NotePropsV2,
    opts?: EngineUpdateNodesOptsV2
  ): Promise<void> {
    throw Error("not implemented");
  }
  async updateSchema(schema: SchemaModulePropsV2): Promise<void> {
    throw Error("not implemented");
  }
  async writeNote(note: NotePropsV2, opts?: EngineWriteOptsV2): Promise<void> {
    const ctx = "write";
    const resp = await this.api.engineWrite({
      node: note,
      opts,
      ws: this.ws,
    });
    await this.refreshNodes([note], note.type);
    Logger.info({ ctx, msg: "exit", resp });
    return;
  }
  async writeSchema(schema: SchemaModulePropsV2): Promise<void> {
    throw Error("not implemented");
  }
}
