class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://artify-ai-api.victorbatistafp.workers.dev',
  );
}
