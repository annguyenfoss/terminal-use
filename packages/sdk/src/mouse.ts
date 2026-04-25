export interface Mouse {
  isSupported(): false
}

export class SdkMouse implements Mouse {
  isSupported(): false {
    return false
  }
}
