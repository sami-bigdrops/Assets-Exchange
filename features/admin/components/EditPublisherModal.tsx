"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getVariables } from "@/components/_variables";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getPublisher } from "@/features/admin/services/publishers.client";
import { usePublisherViewModel } from "@/features/admin/view-models/usePublisherViewModel";

interface EditPublisherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  publisherId: string;
  onSuccess?: () => void;
}

export function EditPublisherModal({
  open,
  onOpenChange,
  publisherId,
  onSuccess,
}: EditPublisherModalProps) {
  const variables = getVariables();
  const { onUpdate } = usePublisherViewModel();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    status: "active",
    platform: "",
  });

  useEffect(() => {
    if (open && publisherId) {
      setIsLoading(true);
      getPublisher(publisherId)
        .then((pub) => {
          setFormData({
            name: pub.name || "",
            contactEmail: pub.contactEmail || "",
            status: pub.status.toLowerCase(),
            platform: pub.platform || "",
          });
        })
        .catch(() => toast.error("Failed to fetch publisher details"))
        .finally(() => setIsLoading(false));
    }
  }, [open, publisherId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdate(publisherId, {
        name: formData.name,
        contactEmail: formData.contactEmail,
        status: formData.status as "active" | "inactive",
        platform: formData.platform,
      });
      toast.success("Publisher updated successfully");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Failed to update publisher");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Publisher Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Publisher Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input
                type="email"
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Platform</Label>
              <Select
                value={formData.platform}
                onValueChange={(val) =>
                  setFormData({ ...formData, platform: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Platform" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Cake",
                    "HasOffers",
                    "Tune",
                    "Impact",
                    "Everflow",
                  ].map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) =>
                  setFormData({ ...formData, status: val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
