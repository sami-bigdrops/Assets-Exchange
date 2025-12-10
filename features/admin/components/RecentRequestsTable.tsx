import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { RecentRequest } from "../types/admin.types";

interface RecentRequestsTableProps {
  requests: RecentRequest[];
}

function getStatusVariant(
  status: RecentRequest["status"]
): "default" | "secondary" | "destructive" {
  switch (status) {
    case "approved":
      return "default";
    case "pending":
      return "secondary";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

export function RecentRequestsTable({ requests }: RecentRequestsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Advertiser</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                No requests found
              </TableCell>
            </TableRow>
          ) : (
            requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">
                  {request.advertiserName}
                </TableCell>
                <TableCell>{request.publisherName}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(request.status)}>
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell>${request.amount.toLocaleString()}</TableCell>
                <TableCell>{request.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
