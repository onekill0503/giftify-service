export default class BasicResponse {
  message: string;
  data: any;

  constructor(data: { message?: string; data?: any }) {
    this.message = data?.message ?? ``;
    this.data = data?.data;
  }
}
