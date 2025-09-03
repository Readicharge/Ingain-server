import mongoose, { Schema, models } from "mongoose"

const apiLogSchema = new Schema({
  endpoint: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  statusCode: {
    type: Number,
    required: true,
  },
  responseTime: {
    type: Number, // in milliseconds
  },
  ipAddress: {
    type: String,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "PlatformUser", // or "User" for admin API calls
    required: false, // Can be null for unauthenticated requests
  },
  userAgent: {
    type: String,
  },
  requestBody: {
    type: Schema.Types.Mixed, // Store request payload (sanitized)
  },
  responseBody: {
    type: Schema.Types.Mixed, // Store response payload (sanitized)
  },
  errorMessage: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
})

const ApiLog = models.ApiLog || mongoose.model("ApiLog", apiLogSchema)

export default ApiLog
