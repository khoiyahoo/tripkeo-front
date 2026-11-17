import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import { exportPdf } from "@/utils/pdfExport";

interface Props {
  /** Trả về HTML, hoặc null nếu chưa đủ điều kiện (đã tự báo lỗi). */
  buildHtml: () => string | null;
  /** Kiểm tra trước khi xem/xuất; trả về thông báo lỗi nếu không hợp lệ. */
  guard: () => string | null;
  shareTitle: string;
}

/** Cặp nút "Xem PDF" (xem trước) và "Tải PDF" (chia sẻ / lưu) giống web. */
export const PdfActions = ({ buildHtml, guard, shareTitle }: Props) => {
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const check = (): boolean => {
    const message = guard();
    if (message) {
      Alert.alert("Chưa thể xuất PDF", message);
      return false;
    }
    return true;
  };

  const preview = () => {
    if (!check()) return;
    setPreviewHtml(buildHtml());
  };

  const download = async (html?: string | null) => {
    const content = html ?? (check() ? buildHtml() : null);
    if (!content) return;
    setIsGenerating(true);
    try {
      await exportPdf(content, shareTitle);
    } catch {
      Alert.alert("Lỗi", "Không thể tạo PDF. Vui lòng thử lại.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <View className="flex-row gap-3">
        <Pressable
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-outline-variant active:opacity-70"
          onPress={preview}
        >
          <Ionicons color="#abbbc2" name="eye-outline" size={18} />
          <Text className="font-medium text-on-surface">Xem PDF</Text>
        </Pressable>
        <Pressable
          className="h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-outline-variant active:opacity-70"
          disabled={isGenerating}
          onPress={() => download()}
        >
          {isGenerating ? (
            <ActivityIndicator color="#abbbc2" />
          ) : (
            <Ionicons color="#abbbc2" name="download-outline" size={18} />
          )}
          <Text className="font-medium text-on-surface">Tải PDF</Text>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setPreviewHtml(null)}
        presentationStyle="pageSheet"
        visible={previewHtml !== null}
      >
        <SafeAreaView className="flex-1 bg-surface" edges={["top", "bottom"]}>
          <View className="flex-row items-center justify-between border-outline-variant border-b px-4 py-3">
            <Pressable hitSlop={12} onPress={() => setPreviewHtml(null)}>
              <Ionicons color="#abbbc2" name="close" size={24} />
            </Pressable>
            <Text className="font-semibold text-on-surface">Xem trước PDF</Text>
            <Pressable
              className="flex-row items-center gap-1"
              disabled={isGenerating}
              hitSlop={12}
              onPress={() => download(previewHtml)}
            >
              {isGenerating ? (
                <ActivityIndicator color="#eb5757" size="small" />
              ) : (
                <Ionicons color="#eb5757" name="download-outline" size={20} />
              )}
              <Text className="font-medium text-primary-500">Tải</Text>
            </Pressable>
          </View>
          {previewHtml !== null && (
            <WebView
              originWhitelist={["*"]}
              source={{ html: previewHtml }}
              style={{ flex: 1, backgroundColor: "#fff" }}
            />
          )}
        </SafeAreaView>
      </Modal>
    </>
  );
};
