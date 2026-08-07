export const sendSuccess = (res, statusCode, data, message = 'Success') => {
  res.status(statusCode).json({
    success: true,
    data,
    message,
    error: null
  });
};
