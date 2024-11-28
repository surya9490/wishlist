// Helper function for error responses
const handleError = (message, error, status = 500) => {
  console.error(message, error);
  return { message, error: error.message || error, status };
};

export default handleError