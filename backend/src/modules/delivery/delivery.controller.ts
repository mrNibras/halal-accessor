import { Request, Response } from "express";
import { getDeliveryDetails } from "./delivery.service";
import { deliveryFeeSchema } from "../../shared/validators";

export const getDeliveryFee = async (req: Request, res: Response) => {
  try {
    const { lat, lng } = deliveryFeeSchema.parse(req.body);

    const details = await getDeliveryDetails(lat, lng);

    res.json(details);
  } catch (err: any) {
    res.status(400).json({ message: err.message || "Failed to calculate delivery fee" });
  }
};
