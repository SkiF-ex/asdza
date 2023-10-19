const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
  entry: {
    popup: './js/popup.js',
    background: './js/background.js',
    "content-script": './js/content-script.js',
    speech: './js/speech.js',
    "speech-initializer": './js/speech-initializer.js',
  },
  optimization: {
    minimize: false,
  },
  output: {
    filename: 'js/[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        { from: './html', to: 'html' },
        { from: './styles', to: 'styles' },
        { from: './images', to: 'images' },
        { from: './src', to: 'src' },
        { from: './_locales', to: '_locales' },
        { from: './rules-1.json', to: '' },
        { from: 'manifest.json', to: 'manifest.json' },
      ],
    }),
  ],
};
