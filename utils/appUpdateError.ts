export class AppUpdateRequiredError extends Error {
  constructor() {
    super("Please update your app to continue");
    this.name = "AppUpdateRequiredError";
  }
}
