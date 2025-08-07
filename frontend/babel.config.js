module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
          alias: {
            '@': './src',
            '@/api': './src/api',
            '@/features': './src/features',
            '@/shared': './src/features/shared',
            '@/components': './src/features/shared/components',
            '@/constants': './src/features/shared/constants',
            '@/context': './src/features/shared/context',
            '@/assets': './src/assets',
            '@/types': './src/features/shared/types'
          }
        }
      ]
    ]
  };
}; 