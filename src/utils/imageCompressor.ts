/**
 * 将用户上传的本地照片进行正方形居中裁剪与质量压缩，返回 Base64 DataURL
 * @param file 用户选中的图片文件 (File)
 * @param targetSize 输出目标宽高（像素，默认 200px）
 * @param quality 压缩质量 (0.1 ~ 1.0，默认 0.85)
 */
export function compressAndCropImage(
  file: File,
  targetSize: number = 200,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('请选择有效的图片文件'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('加载图片失败'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建 Canvas 上下文'));
          return;
        }

        // 计算居中正方形裁剪坐标
        const minSide = Math.min(img.width, img.height);
        const sourceX = (img.width - minSide) / 2;
        const sourceY = (img.height - minSide) / 2;

        // 平滑绘制
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          minSide,
          minSide,
          0,
          0,
          targetSize,
          targetSize
        );

        // 输出为 webp 或 jpeg，优先 webp 体积更小
        try {
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve(dataUrl);
        } catch {
          const fallbackDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(fallbackDataUrl);
        }
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
