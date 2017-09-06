var animate = window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function(callback) { window.setTimeout(callback, 1000/60) };
var canvas = document.createElement('canvas');
var width = 600;
var height = 800;
canvas.width = width;
canvas.height = height;
var context = canvas.getContext('2d');
window.onload = function() {
  document.body.appendChild(canvas);
  animate(step);
};
var step = function() {
  update();
  render();
  animate(step);
};
