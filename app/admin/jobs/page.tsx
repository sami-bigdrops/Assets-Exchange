import JobsTable from "@/components/JobsTable";

export default function JobsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col gap-4 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Background Jobs</h1>
                <p className="text-muted-foreground">
                    Monitor system background processes, inspect failures, and manage retry queues.
                </p>
            </div>
            <JobsTable />
        </div>
    );
}
