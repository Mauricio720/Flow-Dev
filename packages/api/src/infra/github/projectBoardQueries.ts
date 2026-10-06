const PRIORITY_FIELD = "... on ProjectV2Field { id dataType }";
const BOARD_FIELDS = `id title url closed field(name:"Status"){ ... on ProjectV2SingleSelectField { id options { id name } } } prioridade: field(name:"Prioridade"){ ${PRIORITY_FIELD} } priority: field(name:"Priority"){ ${PRIORITY_FIELD} }`;

export const ORGANIZATION_BOARD_QUERY = `query($login:String!,$number:Int!){ owner: organization(login:$login){ projectV2(number:$number){ ${BOARD_FIELDS} } } }`;
export const USER_BOARD_QUERY = `query($login:String!,$number:Int!){ owner: user(login:$login){ projectV2(number:$number){ ${BOARD_FIELDS} } } }`;
export const BOARD_NODE_QUERY = `query($id:ID!){ node(id:$id){ ... on ProjectV2 { ${BOARD_FIELDS} } } }`;
export const ISSUE_PRESENCE_QUERY = "query($id:ID!){ node(id:$id){ ... on Issue { state projectItems(first:100){ nodes { project { id } } } } } }";
export const ADD_ITEM_MUTATION = "mutation($board:ID!,$content:ID!){ addProjectV2ItemById(input:{projectId:$board,contentId:$content}){ item { id } } }";
export const SET_STATUS_MUTATION = "mutation($board:ID!,$item:ID!,$field:ID!,$option:String!){ updateProjectV2ItemFieldValue(input:{projectId:$board,itemId:$item,fieldId:$field,value:{singleSelectOptionId:$option}}){ projectV2Item { id } } }";

export const SET_PRIORITY_MUTATION = "mutation($board:ID!,$item:ID!,$field:ID!,$points:Float!){ updateProjectV2ItemFieldValue(input:{projectId:$board,itemId:$item,fieldId:$field,value:{number:$points}}){ projectV2Item { id } } }";

type PriorityField = { id?: string; dataType?: string } | null;
export type BoardNode = { id?: string; title?: string; url?: string; closed?: boolean; field?: { id?: string; options?: { id: string; name: string }[] } | null; prioridade?: PriorityField; priority?: PriorityField };
export type OwnerBoardData = { owner?: { projectV2?: BoardNode | null } | null };
export type BoardNodeData = { node?: BoardNode | null };
export type IssuePresenceData = { node?: { state?: string; projectItems?: { nodes?: ({ project?: { id?: string } | null } | null)[] } } | null };
export type AddItemData = { addProjectV2ItemById?: { item?: { id?: string } | null } | null };
