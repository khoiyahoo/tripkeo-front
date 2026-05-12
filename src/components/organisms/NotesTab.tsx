import {
  CheckSquare,
  Edit3,
  FileText,
  Plus,
  Square,
  Upload,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { ChecklistItem, TripNote } from "@/types/trip";

interface NotesTabProps {
  notes: TripNote[];
  checklist: ChecklistItem[];
}

export const NotesTab = ({ notes, checklist }: NotesTabProps) => {
  const [items, setItems] = useState(checklist);

  const toggleItem = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      )
    );
  };

  const completedCount = items.filter((i) => i.isChecked).length;

  return (
    <div className="space-y-6">
      {/* Notes */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Ghi chú chung</CardTitle>
          <Button variant="ghost" size="sm">
            <Edit3 className="mr-1 h-3.5 w-3.5" />
            Chỉnh sửa
          </Button>
        </CardHeader>
        <CardContent>
          {notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-xl bg-surface-dim/50 p-4">
                  <p className="whitespace-pre-wrap text-on-surface text-sm">
                    {note.content}
                  </p>
                  <p className="mt-2 text-on-surface-variant text-xs">
                    Cập nhật bởi {note.updatedBy}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <Textarea placeholder="Nhập ghi chú cho cả nhóm..." rows={4} />
          )}
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Checklist đồ cần mang</CardTitle>
            <p className="mt-1 text-on-surface-variant text-xs">
              {completedCount}/{items.length} đã hoàn thành
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-1 h-3.5 w-3.5" />
            Thêm mục
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleItem(item.id)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-surface-dim/50"
              >
                {item.isChecked ? (
                  <CheckSquare className="h-5 w-5 shrink-0 text-primary-500" />
                ) : (
                  <Square className="h-5 w-5 shrink-0 text-outline-variant" />
                )}
                <span
                  className={cn(
                    "flex-1 text-sm",
                    item.isChecked
                      ? "text-on-surface-variant line-through"
                      : "text-on-surface"
                  )}
                >
                  {item.label}
                </span>
                {item.assignee && (
                  <span className="text-on-surface-variant text-xs">
                    {item.assignee}
                  </span>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card className="border-none shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Tài liệu</CardTitle>
          <Button variant="outline" size="sm">
            <Upload className="mr-1 h-3.5 w-3.5" />
            Tải lên
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-xl border border-outline-variant border-dashed py-8">
            <FileText className="mb-2 h-8 w-8 text-on-surface-variant/50" />
            <p className="text-on-surface-variant text-sm">
              Kéo thả hoặc click để tải tài liệu lên
            </p>
            <p className="mt-1 text-on-surface-variant/70 text-xs">
              Vé máy bay, booking khách sạn, bản đồ...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
