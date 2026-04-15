export namespace development {
    let client: string;
    namespace connection {
        let host: string;
        let port: number;
        let user: string;
        let password: string;
        let database: string;
    }
    namespace migrations {
        let tableName: string;
        let directory: string;
    }
}
