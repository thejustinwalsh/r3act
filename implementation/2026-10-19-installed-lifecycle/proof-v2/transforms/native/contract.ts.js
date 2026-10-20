export const ROW_COUNT = 256;
export const UPDATE_COUNT = 60;
export const initialRows = () => Array.from({ length: ROW_COUNT }, (_, id) => id);
export const editedRows = () => [
	...initialRows().slice(2),
	ROW_COUNT,
	0
];
