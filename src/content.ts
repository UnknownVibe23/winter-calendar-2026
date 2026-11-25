export interface Content {
  v: 1;
  name: string;
  greeting: string;
  doors: Array<{ n: number; text: string }>;
}
export interface Bundle {
  v: 1;
  alg: 'PBKDF2-SHA256-AES-GCM';
  iter: number;
  salt: string;
  iv: string;
  ct: string;
}
