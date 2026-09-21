/**
 * 브라우저 안에서만 도는 MRZ 판독.
 *
 * 이미지는 <canvas> 로만 다루고 네트워크로 나가지 않는다. Tesseract는 워커와 학습 데이터를
 * 내려받지만 그건 인식 엔진일 뿐, 사진은 이 기기를 떠나지 않는다.
 */
import { createWorker, PSM } from 'tesseract.js'
import { parseMrz, type MrzResult } from './parse'

/** MRZ에 나올 수 있는 문자만. 후보를 좁히는 것만으로 오인식이 크게 줄어든다. */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'

/**
 * 여권 사진에서 MRZ가 있는 아래쪽 띠만 잘라 내고, 흑백으로 바꿔 대비를 올린다.
 * 얼굴면 전체를 넘기면 이름·도장·홀로그램 글자가 섞여 들어와 판독이 나빠진다.
 */
async function preprocess(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file)
  // MRZ는 여권 사진면의 아래 약 30% 안에 있다.
  const cropTop = Math.floor(bitmap.height * 0.68)
  const cropHeight = bitmap.height - cropTop

  // 작은 사진은 키워야 글자가 잡힌다. 1600px 정도면 충분하다.
  const scale = Math.min(3, Math.max(1, 1600 / bitmap.width))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(cropHeight * scale)

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, cropTop, bitmap.width, cropHeight, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  // 회색조 + 단순 임계값. 종이 여권의 MRZ는 대비가 확실해서 이 정도로 충분하다.
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const px = image.data
  for (let i = 0; i < px.length; i += 4) {
    const gray = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
    const v = gray > 128 ? 255 : 0
    px[i] = px[i + 1] = px[i + 2] = v
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

export async function scanPassport(file: File): Promise<MrzResult> {
  const canvas = await preprocess(file)
  const worker = await createWorker('eng')
  try {
    await worker.setParameters({
      tessedit_char_whitelist: CHARSET,
      // MRZ는 줄 단위 텍스트 덩어리다. 문단 추정을 끄면 줄이 덜 깨진다.
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    })
    const { data } = await worker.recognize(canvas)
    return parseMrz(data.text)
  } finally {
    await worker.terminate()
    // 캔버스를 비워 이미지가 메모리에 남지 않게 한다.
    canvas.width = 0
    canvas.height = 0
  }
}
