/*! Angular-PDF Version: 0.3.4 | (C) Sayanee Basu 2014, released under an MIT license */
/*
  Code for scaling inspired by:
    https://github.com/mozilla/pdf.js/blob/master/web/viewer.js
*/
(function() {

  'use strict';

  angular.module('pdf', []).directive('ngPdf', function($window) {
    return {
      restrict: 'E',
      templateUrl: function(element, attr) {
        return attr.templateUrl ? attr.templateUrl : 'partials/viewer.html'
      },
      link: function(scope, element, attrs) {
        var url = scope.pdfUrl,
          pdfDoc = null,
          pageNum = 1,
          scale = (attrs.scale ? attrs.scale : "auto"),
          scaleNumeric = null,
          canvas = (attrs.canvasid ? document.getElementById(attrs.canvasid) : document.getElementById('pdf-canvas')),
          ctx = canvas.getContext('2d'),
          windowEl = angular.element($window),
          renderPromise = null,
          MAX_AUTO_SCALE = 1.25,
          MIN_SCALE = 0.25,
          MAX_SCALE = 10.0;

        windowEl.on('scroll', function() {
          scope.$apply(function() {
            scope.scroll = windowEl[0].scrollY;
          });
        });

        PDFJS.disableWorker = true;
        scope.pageNum = pageNum;

        function translateScale(scale, page) {
          window.RARA = page;
          if(scale > 0)
            return scale;
          // all non-numeric scale values
          var w = page.view[2] - page.view[0]
          var h = page.view[3] - page.view[1]
          var containerWidth = 0;
          var containerHeight = 0;
          var curContainer = element[0];
          while(containerWidth === 0 && curContainer != null) {
            containerWidth = curContainer.clientWidth;
            containerHeight = curContainer.clientHeight;
            curContainer = curContainer.parentElement;
          }
          var pageWidthScale = containerWidth / w;
          var pageHeightScale = containerHeight / h;
          
          var newScale = 0;
          switch (scale) {
            case 'page-width':
              newScale = pageWidthScale;
            case 'page-height':
              newScale = pageHeightScale;
            case 'page-fit':
              newScale = Math.min(pageWidthScale, pageHeightScale);
            case 'auto':
              var isLandscape = (w > h);
              // fit the page to width in landscape, unless the page becomes too wide
              var hScale = (isLandscape) ? Math.min(pageHeightScale, pageWidthScale) : pageWidthScale;
              newScale = Math.min(MAX_AUTO_SCALE, hScale);
            default:
              console.error('dont know how to scale to "'+scale+'".');
              newScale = 1;
          }

          // sanitize zoom, fallback to 1
          if (newScale === 0) newScale = 1;

          return newScale
        }

        scope.renderPage = function(num) {
          return pdfDoc.getPage(num).then(function(page) {
            scaleNumeric = translateScale(scale, page)
            if(scaleNumeric > MAX_SCALE)
              scaleNumeric = MAX_SCALE;
            if(scaleNumeric < MIN_SCALE)
              scaleNumeric = MIN_SCALE;
            var viewport = page.getViewport(scaleNumeric),
              renderContext = {};

            canvas.height = viewport.height;
            canvas.width = viewport.width;

            renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            // cancel the previous rendering task if it is still running
            if(renderPromise != null && !renderPromise.promise.isFulfilled())
              renderPromise.cancel()
            renderPromise = page.render(renderContext);
          });

        };

        scope.goPrevious = function() {
          if (scope.pageToDisplay <= 1) {
            return;
          }
          scope.pageToDisplay = scope.pageToDisplay - 1;
          scope.renderPage(scope.pageToDisplay);
        };

        scope.goNext = function() {
          if (scope.pageToDisplay >= pdfDoc.numPages) {
            return;
          }
          scope.pageToDisplay = scope.pageToDisplay + 1;
          scope.renderPage(scope.pageToDisplay);
        };

        scope.zoomIn = function() {
          scale = parseFloat(scaleNumeric) + 0.2;
          return scope.renderPage(scope.pageToDisplay).then(function(){
            return {
              scale: scale,
              height: canvas.height,
              width: canvas.width
            };
          });
        };

        scope.zoomOut = function() {
          scale = parseFloat(scaleNumeric) - 0.2;
          return scope.renderPage(scope.pageToDisplay).then(function(){
            return {
              scale: scale,
              height: canvas.height,
              width: canvas.width
            };
          });
        };

        scope.setPDFZoom = function(val) {
          scale = val;
        }

        scope.getPDFZoom = function () {
          return parseFloat(scaleNumeric);
        }

        scope.changePage = function() {
          scope.renderPage(scope.pageToDisplay);
        };

        scope.rotate = function() {
          if (canvas.getAttribute('class') === 'rotate0') {
            canvas.setAttribute('class', 'rotate90');
          } else if (canvas.getAttribute('class') === 'rotate90') {
            canvas.setAttribute('class', 'rotate180');
          } else if (canvas.getAttribute('class') === 'rotate180') {
            canvas.setAttribute('class', 'rotate270');
          } else {
            canvas.setAttribute('class', 'rotate0');
          }
        };

        scope.loadPDF = function(options) {
          if(!options) {
            return;
          }
          return PDFJS.getDocument(options).then(function(_pdfDoc) {
            pdfDoc = _pdfDoc;
            scope.renderPage(scope.pageToDisplay);

            scope.$apply(function() {
              scope.pageCount = _pdfDoc.numPages;
            });
          });
        };

        scope.loadPDF(url);

        scope.getPDFDoc = function() {
          return pdfDoc;
        };

        scope.$watch('pageNum', function(newVal) {
          scope.pageToDisplay = parseInt(newVal);
          if (pdfDoc !== null) {
            scope.renderPage(scope.pageToDisplay);
          }
        });

      }
    };
  });

})();
