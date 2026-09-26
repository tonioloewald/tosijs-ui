declare const AbTest_base: import("tosijs").WithAttributes<{
    condition: string;
    not: boolean;
}>;
export declare class AbTest extends AbTest_base {
    static preferredTagName: string;
    static set conditions(context: {
        [key: string]: any;
    });
    static instances: Set<AbTest>;
    connectedCallback(): void;
    disconnectedCallback(): void;
    render(): void;
}
export declare const abTest: import("tosijs").ElementCreator<AbTest>;
export {};
