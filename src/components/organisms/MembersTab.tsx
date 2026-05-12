import { Crown, UserPlus } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/format";

import type { TripMember } from "@/types/trip";

interface MembersTabProps {
  members: TripMember[];
}

export const MembersTab = ({ members }: MembersTabProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-on-surface">
          Thành viên ({members.length})
        </h3>
        <Button size="sm">
          <UserPlus className="mr-1 h-3.5 w-3.5" />
          Mời thêm
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {members.map((member) => (
          <Card key={member.id} className="border-none shadow-sm">
            <CardContent className="flex items-center gap-4 p-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback className="bg-primary-100 text-primary-800">
                  {member.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-on-surface">
                    {member.name}
                  </span>
                  {member.role === "admin" && (
                    <Crown className="h-4 w-4 text-tertiary-500" />
                  )}
                </div>
                <div className="mt-1 flex gap-3 text-xs">
                  <span className="text-on-surface-variant">
                    Đã chi:{" "}
                    <span className="font-medium text-on-surface">
                      {formatCurrency(member.totalPaid)}
                    </span>
                  </span>
                </div>
              </div>
              <Badge
                className={cn(
                  "shrink-0",
                  member.paymentStatus === "paid"
                    ? "bg-success-50 text-success-700"
                    : "bg-tertiary-50 text-tertiary-700"
                )}
              >
                {member.paymentStatus === "paid" ? "Đã TT" : "Chưa TT"}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
