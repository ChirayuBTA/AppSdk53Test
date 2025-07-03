interface ISendOTPRequestBody {
  phone: string;
}

interface IVerifyOTPRequestBody extends ISendOTPRequestBody {
  otp: string;
}
interface IVerifyPromoBody {
  phone: string;
  promoCode: string;
  promoterId: string;
  userId: string;
}
interface ICreateAreaBody {
  name: string;
  cityId: string;
}
