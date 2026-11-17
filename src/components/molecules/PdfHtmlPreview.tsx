interface PdfHtmlPreviewProps {
  html: string;
}

/** Xem trước tài liệu (HTML tự co theo chiều ngang) trong hộp thoại trên điện thoại — không cuộn ngang. */
export const PdfHtmlPreview = ({ html }: PdfHtmlPreviewProps) => (
  <iframe
    className="min-h-0 w-full flex-1 border-0 bg-white"
    sandbox="allow-same-origin"
    srcDoc={html}
    title="Xem trước PDF"
  />
);
