import { Check, Plus, Vote } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Poll } from "@/types/trip";

interface VotesTabProps {
  polls: Poll[];
}

const PollCard = ({ poll }: { poll: Poll }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{poll.question}</CardTitle>
          {poll.isActive ? (
            <span className="flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 font-medium text-success-700 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-success-500" />
              Đang mở
            </span>
          ) : (
            <span className="rounded-full bg-surface-dim px-2 py-0.5 font-medium text-on-surface-variant text-xs">
              Đã đóng
            </span>
          )}
        </div>
        <p className="text-on-surface-variant text-xs">
          Tạo bởi {poll.createdBy} · {totalVotes} lượt bình chọn
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {poll.options.map((option) => {
          const votePct =
            totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
          const isSelected = selectedOption === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => poll.isActive && setSelectedOption(option.id)}
              disabled={!poll.isActive}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border p-3 text-left transition",
                isSelected
                  ? "border-primary-400 bg-primary-50"
                  : "border-outline-variant/30 hover:border-outline-variant",
                !poll.isActive && "cursor-default"
              )}
            >
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isSelected && <Check className="h-4 w-4 text-primary-600" />}
                  <span className="font-medium text-on-surface text-sm">
                    {option.label}
                  </span>
                </div>
                <span className="font-semibold text-on-surface-variant text-sm">
                  {option.votes.length} ({Math.round(votePct)}%)
                </span>
              </div>
              {option.description && (
                <p className="relative z-10 mt-1 text-on-surface-variant text-xs">
                  {option.description}
                </p>
              )}
              {/* Progress bar background */}
              <div
                className="absolute inset-y-0 left-0 bg-primary-100/50 transition-all"
                style={{ width: `${votePct}%` }}
              />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};

export const VotesTab = ({ polls }: VotesTabProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-on-surface">
          Bình chọn ({polls.length})
        </h3>
        <Button size="sm">
          <Plus className="mr-1 h-3.5 w-3.5" />
          Tạo bình chọn
        </Button>
      </div>

      {polls.length > 0 ? (
        <div className="space-y-4">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-outline-variant border-dashed py-12">
          <Vote className="mb-3 h-10 w-10 text-on-surface-variant/50" />
          <p className="font-medium text-on-surface">Chưa có bình chọn nào</p>
          <p className="mt-1 text-on-surface-variant text-sm">
            Tạo bình chọn để lấy ý kiến nhóm
          </p>
        </div>
      )}
    </div>
  );
};
