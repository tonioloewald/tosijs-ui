export type SortValuator<T = object> = (f: T) => (string | number)[];
export type SortCallback<T = object> = (p: T, q: T) => number;
export declare function makeSorter<T>(sortValuator: SortValuator<T>, ascending?: boolean | boolean[]): SortCallback<T>;
