export class AppUpdateRequiredError extends Error {
  version?: string;

  constructor(version?: string) {
    const message = version
      ? `Please update your app to version ${version} to continue`
      : "Please update your app to continue";
    super(message);
    this.name = "AppUpdateRequiredError";
    this.version = version;
  }
}
