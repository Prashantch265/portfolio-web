export type TagKind = "project" | "post";

export interface TagRow {
  id: string;
  label: string;
  kind: TagKind;
}
