export interface AuthHealthCheck {
  status: "success" | "error";

  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: null;
    image: string;
    formFillingsCredit: number;
    phone: string;
  };
  limitations: {
    plan?: null | {
      id: number;
      planName: string;
      maxFillingProfiles: number;
      maxWebsitesPerProfile: number;
      extraFeatures: string;
      isOnSale: boolean;
      afterSalePrice: string | null;
      currentPrice: string;
      stripePaymentLink: string;
    };
    maxFillingProfiles: number;
    maxWebsitesPerProfile: number;
  };
}
