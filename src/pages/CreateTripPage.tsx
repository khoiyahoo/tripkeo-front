import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Mail,
  MapPin,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { type KeyboardEvent, useState } from "react";

import { DatePicker } from "@/components/molecules/DatePicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useTrips } from "@/hooks/useTrips";
import { MainLayout } from "@/layouts/MainLayout";
import { cn } from "@/lib/utils";

import type { CreateTripInput, InvitedMember } from "@/types/firestore";

const STEPS = [
  { id: 1, label: "Thông tin", icon: MapPin },
  { id: 2, label: "Thành viên", icon: Users },
];

// ─── Picsum helpers ───────────────────────────────────────────
const generateCoverSeed = (): string => Math.random().toString(36).slice(2, 10);

const picsumCoverUrl = (seed: string): string =>
  `https://picsum.photos/seed/${seed}/1200/600`;

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-2">
    {STEPS.map((step, idx) => (
      <div key={step.id} className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full font-semibold text-sm transition-colors",
            currentStep >= step.id
              ? "bg-primary-500 text-white"
              : "bg-surface-dim text-on-surface-variant"
          )}
        >
          {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
        </div>
        <span
          className={cn(
            "hidden font-medium text-sm sm:inline",
            currentStep >= step.id
              ? "text-on-surface"
              : "text-on-surface-variant"
          )}
        >
          {step.label}
        </span>
        {idx < STEPS.length - 1 && (
          <div
            className={cn(
              "mx-2 h-0.5 w-8 rounded-full",
              currentStep > step.id ? "bg-primary-500" : "bg-surface-dim"
            )}
          />
        )}
      </div>
    ))}
  </div>
);

interface FormData {
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  coverSeed: string;
  description: string;
  invitedMembers: InvitedMember[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getTodayDateStr = (): string => {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - tzOffsetMs).toISOString().split("T")[0];
};

const CreateTripPage = () => {
  const todayDateStr = getTodayDateStr();
  const navigate = useNavigate();
  const { handleCreateTrip } = useTrips();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_formError, setFormError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<
    "editor" | "member" | "treasurer"
  >("editor");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    destination: "",
    startDate: "",
    endDate: "",
    coverSeed: generateCoverSeed(),
    description: "",
    invitedMembers: [],
  });

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "startDate" || field === "endDate") {
      setDateError(null);
    }
  };

  const validateDates = (): boolean => {
    if (formData.startDate && formData.startDate < todayDateStr) {
      setDateError("Ngày bắt đầu không thể trong quá khứ");
      return false;
    }
    if (!formData.startDate || !formData.endDate) return true;
    if (formData.startDate > formData.endDate) {
      setDateError("Ngày kết thúc không thể trước ngày bắt đầu");
      return false;
    }
    setDateError(null);
    return true;
  };

  const addEmail = (email: string) => {
    const trimmed = email.trim().toLowerCase();
    setEmailError(null);

    if (!trimmed) return;

    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Email không hợp lệ");
      return;
    }

    if (formData.invitedMembers.some((m) => m.email === trimmed)) {
      setEmailError("Email đã được thêm");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      invitedMembers: [
        ...prev.invitedMembers,
        { email: trimmed, role: inviteRole },
      ],
    }));
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setFormData((prev) => ({
      ...prev,
      invitedMembers: prev.invitedMembers.filter((m) => m.email !== email),
    }));
  };

  const handleEmailKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addEmail(emailInput);
    }
    if (
      e.key === "Backspace" &&
      !emailInput &&
      formData.invitedMembers.length > 0
    ) {
      removeEmail(
        formData.invitedMembers[formData.invitedMembers.length - 1].email
      );
    }
  };

  const handleEmailPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const emails = pasted.split(/[,;\s\n]+/).filter(Boolean);
    for (const email of emails) {
      const trimmed = email.trim().toLowerCase();
      if (
        EMAIL_REGEX.test(trimmed) &&
        !formData.invitedMembers.some((m) => m.email === trimmed)
      ) {
        setFormData((prev) => ({
          ...prev,
          invitedMembers: [
            ...prev.invitedMembers,
            { email: trimmed, role: inviteRole },
          ],
        }));
      }
    }
    setEmailInput("");
  };

  const isStep1Valid =
    formData.name.trim() !== "" &&
    formData.destination.trim() !== "" &&
    formData.startDate !== "" &&
    formData.endDate !== "" &&
    formData.startDate <= formData.endDate;

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (!validateDates()) return;
      if (!isStep1Valid) return;
    }
    setCurrentStep((s) => Math.min(2, s + 1));
  };

  const handleSubmit = async () => {
    if (!validateDates()) return;
    if (!isStep1Valid) return;

    setIsSubmitting(true);
    setFormError(null);

    const input: CreateTripInput = {
      name: formData.name.trim(),
      destination: formData.destination.trim(),
      coverImage: picsumCoverUrl(formData.coverSeed),
      startDate: formData.startDate,
      endDate: formData.endDate,
      description: formData.description.trim(),
      currency: "VND",
      invitedMembers:
        formData.invitedMembers.length > 0
          ? formData.invitedMembers
          : undefined,
    };

    try {
      const tripId = await handleCreateTrip(input);
      navigate({ to: "/trips/$tripId", params: { tripId } });
    } catch {
      setFormError("Không thể tạo chuyến đi. Vui lòng thử lại.");
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout currentPath="/trips">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-2xl text-on-surface">
            Tạo chuyến đi mới
          </h1>
        </div>

        <StepIndicator currentStep={currentStep} />

        <Card className="border-none shadow-sm">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <Label htmlFor="tripName">Tên chuyến đi *</Label>
                  <Input
                    id="tripName"
                    placeholder="VD: Đà Nẵng - Hội An 4N3Đ"
                    className="mt-1.5"
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="destination">Điểm đến *</Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
                    <Input
                      id="destination"
                      placeholder="Tìm điểm đến..."
                      className="pl-9"
                      value={formData.destination}
                      onChange={(e) =>
                        updateField("destination", e.target.value)
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Ngày bắt đầu *</Label>
                    <div className="mt-1.5">
                      <DatePicker
                        id="startDate"
                        value={formData.startDate}
                        minDate={todayDateStr}
                        placeholder="Chọn ngày bắt đầu"
                        onChange={(val) => {
                          updateField("startDate", val);
                          if (formData.endDate && val > formData.endDate) {
                            updateField("endDate", "");
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="endDate">Ngày kết thúc *</Label>
                    <div className="mt-1.5">
                      <DatePicker
                        id="endDate"
                        value={formData.endDate}
                        minDate={formData.startDate || todayDateStr}
                        placeholder="Chọn ngày kết thúc"
                        onChange={(val) => updateField("endDate", val)}
                      />
                    </div>
                  </div>
                </div>
                {dateError && (
                  <p className="text-error-500 text-sm">{dateError}</p>
                )}
                <div>
                  <Label>Ảnh bìa</Label>
                  <img
                    src={picsumCoverUrl(formData.coverSeed)}
                    alt="Cover preview"
                    className="h-40 w-40 rounded-md object-cover"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      updateField("coverSeed", generateCoverSeed())
                    }
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Đổi ảnh
                  </Button>
                </div>
                <div>
                  <Label htmlFor="description">Mô tả ngắn</Label>
                  <Textarea
                    id="description"
                    placeholder="Mô tả chuyến đi..."
                    className="mt-1.5 bg-surface-dim"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <Label htmlFor="emailInput">Mời thành viên qua email</Label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="flex min-h-10.5 flex-1 flex-wrap items-center gap-1.5 rounded-md border border-outline-variant bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-1">
                      {formData.invitedMembers.map((member) => (
                        <span
                          key={member.email}
                          className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-0.5 text-primary-800 text-sm"
                        >
                          <Mail className="h-3 w-3" />
                          {member.email}
                          <button
                            type="button"
                            onClick={() => removeEmail(member.email)}
                            className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        id="emailInput"
                        type="email"
                        placeholder={
                          formData.invitedMembers.length > 0
                            ? "Thêm email..."
                            : "Nhập email và nhấn Enter, dấu phẩy hoặc Space..."
                        }
                        className="min-w-50 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-on-surface-variant/60"
                        value={emailInput}
                        onChange={(e) => {
                          setEmailInput(e.target.value);
                          setEmailError(null);
                        }}
                        onKeyDown={handleEmailKeyDown}
                        onPaste={handleEmailPaste}
                        onBlur={() => {
                          if (emailInput.trim()) addEmail(emailInput);
                        }}
                      />
                    </div>
                    <Select
                      value={inviteRole}
                      onValueChange={(value) =>
                        setInviteRole(
                          value as "editor" | "member" | "treasurer"
                        )
                      }
                    >
                      <SelectTrigger className="h-10.5 w-37.5">
                        <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="editor">Biên tập</SelectItem>
                        <SelectItem value="member">Thành viên</SelectItem>
                        <SelectItem value="treasurer">Thủ quỹ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {emailError && (
                    <p className="mt-1 text-error-500 text-sm">{emailError}</p>
                  )}
                  <p className="mt-1.5 text-on-surface-variant text-xs">
                    Nhấn Enter, dấu phẩy, hoặc Space để thêm email. Có thể paste
                    nhiều email cùng lúc.
                  </p>
                </div>

                {formData.invitedMembers.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-medium text-on-surface text-sm">
                      {formData.invitedMembers.length} thành viên sẽ được mời
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-surface-dim/50 p-3">
                      {formData.invitedMembers.map((member) => (
                        <div
                          key={member.email}
                          className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-surface-dim"
                        >
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-on-surface-variant" />
                            <span className="text-on-surface text-sm">
                              {member.email}
                            </span>
                            <span className="rounded-full bg-surface-dim px-2 py-0.5 text-on-surface-variant text-xs">
                              {member.role === "editor"
                                ? "Biên tập"
                                : "Thành viên"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeEmail(member.email)}
                            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-error-100 hover:text-error-500"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-surface-dim/50 p-6 text-center">
                    <Users className="mx-auto mb-2 h-10 w-10 text-on-surface-variant/50" />
                    <p className="font-medium text-on-surface">
                      Bạn có thể mời thêm sau khi tạo chuyến đi
                    </p>
                    <p className="mt-1 text-on-surface-variant text-sm">
                      Nhập email thành viên để mời ngay hoặc bỏ qua bước này
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại
          </Button>
          {currentStep < 2 ? (
            <Button
              onClick={handleNextStep}
              disabled={currentStep === 1 && !isStep1Valid}
            >
              Tiếp tục
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              className="bg-primary-600 hover:bg-primary-700"
              onClick={handleSubmit}
              disabled={isSubmitting || !isStep1Valid}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Tạo chuyến đi
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateTripPage;
