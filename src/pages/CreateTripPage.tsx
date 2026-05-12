import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  MapPin,
  Users,
  Wallet,
} from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MainLayout } from "@/layouts/MainLayout";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, label: "Thông tin", icon: MapPin },
  { id: 2, label: "Thành viên", icon: Users },
  { id: 3, label: "Ngân sách", icon: Wallet },
];

const COVER_IMAGES = [
  "https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=400&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
  "https://images.unsplash.com/photo-1528127269322-539801943592?w=400&q=80",
  "https://images.unsplash.com/photo-1506929562872-bb421503ef21?w=400&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80",
  "https://images.unsplash.com/photo-1540979388-5b4b9b3c5e0d?w=400&q=80",
];

const BUDGET_CATEGORIES = [
  { key: "transport", label: "Di chuyển", icon: "✈️" },
  { key: "stay", label: "Chỗ ở", icon: "🏨" },
  { key: "food", label: "Ăn uống", icon: "🍜" },
  { key: "sights", label: "Tham quan", icon: "🎡" },
  { key: "other", label: "Khác", icon: "📦" },
];

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

const Step1BasicInfo = ({
  selectedCover,
  onSelectCover,
}: {
  selectedCover: string;
  onSelectCover: (url: string) => void;
}) => (
  <div className="space-y-5">
    <div>
      <Label htmlFor="tripName">Tên chuyến đi *</Label>
      <Input
        id="tripName"
        placeholder="VD: Đà Nẵng - Hội An 4N3Đ"
        className="mt-1.5"
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
        />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="startDate">Ngày bắt đầu *</Label>
        <div className="relative mt-1.5">
          <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input id="startDate" type="date" className="pl-9" />
        </div>
      </div>
      <div>
        <Label htmlFor="endDate">Ngày kết thúc *</Label>
        <div className="relative mt-1.5">
          <Calendar className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
          <Input id="endDate" type="date" className="pl-9" />
        </div>
      </div>
    </div>
    <div>
      <Label>Ảnh bìa</Label>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {COVER_IMAGES.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onSelectCover(url)}
            className={cn(
              "aspect-video overflow-hidden rounded-lg border-2 transition",
              selectedCover === url
                ? "border-primary-500 ring-2 ring-primary-200"
                : "border-transparent hover:border-outline-variant"
            )}
          >
            <img
              src={url}
              alt="Cover option"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
    <div>
      <Label htmlFor="description">Mô tả ngắn</Label>
      <Textarea
        id="description"
        placeholder="Mô tả chuyến đi..."
        className="mt-1.5"
        rows={3}
      />
    </div>
  </div>
);

const Step2Members = () => (
  <div className="space-y-5">
    <div>
      <Label htmlFor="searchMember">Mời thành viên</Label>
      <div className="relative mt-1.5">
        <Users className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          id="searchMember"
          placeholder="Tìm kiếm bạn bè hoặc nhập email..."
          className="pl-9"
        />
      </div>
    </div>
    <div className="rounded-xl bg-surface-dim/50 p-6 text-center">
      <Users className="mx-auto mb-2 h-10 w-10 text-on-surface-variant/50" />
      <p className="font-medium text-on-surface">Chưa có thành viên nào</p>
      <p className="mt-1 text-on-surface-variant text-sm">
        Tìm kiếm hoặc chia sẻ link mời để thêm bạn bè
      </p>
      <Button variant="outline" size="sm" className="mt-4">
        Sao chép link mời
      </Button>
    </div>
  </div>
);

const Step3Budget = () => (
  <div className="space-y-5">
    <div>
      <Label htmlFor="totalBudget">Tổng ngân sách dự kiến</Label>
      <div className="relative mt-1.5">
        <span className="absolute top-1/2 left-3 -translate-y-1/2 font-medium text-on-surface-variant text-sm">
          ₫
        </span>
        <Input
          id="totalBudget"
          type="number"
          placeholder="10,000,000"
          className="pl-7"
        />
      </div>
    </div>
    <div>
      <Label className="mb-3 block">Phân bổ theo hạng mục</Label>
      <div className="space-y-3">
        {BUDGET_CATEGORIES.map((cat) => (
          <div key={cat.key} className="flex items-center gap-3">
            <span className="w-8 text-center text-lg">{cat.icon}</span>
            <span className="w-24 font-medium text-on-surface text-sm">
              {cat.label}
            </span>
            <Input type="number" placeholder="0" className="flex-1" />
            <span className="text-on-surface-variant text-sm">₫</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const CreateTripPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCover, setSelectedCover] = useState(COVER_IMAGES[0]);

  return (
    <MainLayout currentPath="/trips">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
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
              <Step1BasicInfo
                selectedCover={selectedCover}
                onSelectCover={setSelectedCover}
              />
            )}
            {currentStep === 2 && <Step2Members />}
            {currentStep === 3 && <Step3Budget />}
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
          {currentStep < 3 ? (
            <Button onClick={() => setCurrentStep((s) => Math.min(3, s + 1))}>
              Tiếp tục
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button className="bg-primary-600 hover:bg-primary-700">
              <Check className="mr-2 h-4 w-4" />
              Tạo chuyến đi
            </Button>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateTripPage;
