import { readYAML } from "@dendronhq/common-server";
import fs, { ensureDirSync, writeFileSync } from "fs-extra";
import _ from "lodash";
import path from "path";
import { JSONExportPod, FileImportPod, JSONImportPod } from "./builtin";
import { PodClassEntryV2 } from "./types";
export * from "./types";
export * from "./utils";
export * from "./builtin";
export * from "./base";

export function getAllExportPods(): PodClassEntryV2[] {
  return [JSONExportPod];
}
export function getAllImportPods(): PodClassEntryV2[] {
  return [FileImportPod, JSONImportPod];
}

// === utils

export function getPodConfigPath(
  podsDir: string,
  podClass: PodClassEntryV2
): string {
  return path.join(podsDir, podClass.id, `config.${podClass.kind}.yml`);
}

export function getPodPath(podsDir: string, podClass: PodClassEntryV2): string {
  return path.join(podsDir, podClass.id);
}

export function getPodConfig(
  podsDir: string,
  podClass: PodClassEntryV2
): false | any {
  const podConfigPath = getPodConfigPath(podsDir, podClass);
  if (!fs.existsSync(podConfigPath)) {
    return false;
  } else {
    return readYAML(podConfigPath);
  }
}

export function genPodConfig(podsDir: string, podClass: PodClassEntryV2) {
  const podConfigPath = getPodConfigPath(podsDir, podClass);
  ensureDirSync(path.dirname(podConfigPath));
  const config = podClass
    .config()
    .map((ent) => {
      ent = _.defaults(ent, { default: "TODO" });
      return [
        `# description: ${ent.description}`,
        `# type: ${ent.type}`,
        `${ent.key}: ${ent.default}`,
      ].join("\n");
    })
    .join("\n");
  if (!fs.existsSync(podConfigPath)) {
    writeFileSync(podConfigPath, config);
  }
  return podConfigPath;
}
