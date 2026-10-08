const ASSIGNEES = "assignees(first:100){ nodes{ databaseId login } pageInfo{ hasNextPage endCursor } }";
const ISSUE_CONTENT = `... on Issue { id number url title body state updatedAt repository{ id databaseId name owner{ login } } ${ASSIGNEES} }`;
const ITEM_FIELDS = `id isArchived project{ id } status: fieldValueByName(name:"Status"){ ... on ProjectV2ItemFieldSingleSelectValue { optionId } } content{ __typename ${ISSUE_CONTENT} }`;

export const BOARD_ITEMS_QUERY = `query($id:ID!,$first:Int!,$after:String){ node(id:$id){ ... on ProjectV2 { items(first:$first,after:$after){ pageInfo{ hasNextPage endCursor } nodes{ ${ITEM_FIELDS} } } } } }`;
export const BOARD_ITEM_QUERY = `query($id:ID!){ node(id:$id){ ... on ProjectV2Item { ${ITEM_FIELDS} } } }`;
export const ISSUE_ASSIGNEES_QUERY = `query($id:ID!,$after:String){ node(id:$id){ ... on Issue { assignees(first:100,after:$after){ nodes{ databaseId login } pageInfo{ hasNextPage endCursor } } } } }`;

type RawUser = { databaseId?: number | null; login?: string | null };
type RawAssignees = { nodes?: (RawUser | null)[] | null; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } | null };
export type RawIssue = { id?: string; number?: number; url?: string; title?: string; body?: string; state?: string; updatedAt?: string; repository?: { id?: string; databaseId?: number | null; name?: string; owner?: { login?: string } | null } | null; assignees?: RawAssignees | null };
export type RawItem = { id?: string; isArchived?: boolean; project?: { id?: string } | null; status?: { optionId?: string } | null; content?: ({ __typename?: string } & RawIssue) | null };
export type BoardItemsData = { node?: { items?: { pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } | null; nodes?: (RawItem | null)[] | null } | null } | null };
export type BoardItemData = { node?: RawItem | null };
export type IssueAssigneesData = { node?: { assignees?: RawAssignees | null } | null };
