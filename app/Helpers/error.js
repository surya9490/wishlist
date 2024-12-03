// Helper function for error responses
const handleError = (message, error, status = 500) => {
  // Log the error message and stack (if available)
  console.error(message, error instanceof Error ? error.stack : error);

  // Return a structured error object
  return { 
    message, 
    error: error instanceof Error ? error.message : String(error), 
    status 
  };
};

export default handleError;
