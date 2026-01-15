import { RequestList } from "@/features/admin/components/RequestList";

export default function AdminRequestsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Request Management</h1>
            <RequestList />
        </div>
    );
}
