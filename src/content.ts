export interface DoorPhoto {
  name: string;
  w: number;
  h: number;
  data: string;
  thumb: string;
}
export interface Content {
  v: 1;
  doors: Array<{ n: number; text: string; photo?: DoorPhoto }>;
}
export interface Bundle {
  v: 1;
  alg: 'PBKDF2-SHA256-AES-GCM';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}
