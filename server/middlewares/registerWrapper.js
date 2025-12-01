export const registerWrapper = (controller) => {
  return async (req, res, next) => {
    try {
      await controller(req, res);
      return next();
    } catch (err) {
      return next(err);
    }
  };
};
