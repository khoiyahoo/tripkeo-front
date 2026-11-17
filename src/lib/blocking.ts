import { useLoadingStore } from "@/stores/loadingStore";

export class BlockingTimeoutError extends Error {
  constructor() {
    super("Quá thời gian chờ. Vui lòng kiểm tra kết nối mạng và thử lại.");
    this.name = "BlockingTimeoutError";
  }
}

const DEFAULT_TIMEOUT_MS = 20_000;
/** Dùng cho tác vụ dài như tải nhiều ảnh, nhân bản lịch trình, xóa tài khoản. */
export const LONG_TIMEOUT_MS = 90_000;

/**
 * Chạy một thao tác thêm/sửa/xóa (CRUD) với màn hình loading toàn màn hình chặn
 * mọi tương tác. Nếu thao tác lỗi hoặc quá thời gian thì ném lỗi để nơi gọi
 * hiển thị thông báo — không bao giờ để loading chạy mãi.
 */
export const runBlocking = async <T>(
  task: () => Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> => {
  const { begin, end } = useLoadingStore.getState();
  begin();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new BlockingTimeoutError()), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    end();
  }
};

/** Bọc một hàm async để mỗi lần gọi đều chạy qua runBlocking. */
export const blocking =
  <A extends unknown[], R>(
    fn: (...args: A) => Promise<R>,
    timeoutMs?: number
  ) =>
  (...args: A): Promise<R> =>
    runBlocking(() => fn(...args), timeoutMs);
