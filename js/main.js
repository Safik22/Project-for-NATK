  $(function () {
    const navToggle = document.getElementById('nav-toggle');
    const navList = document.querySelector('.header__nav-list');

    navToggle.addEventListener('click', function() {
      navList.classList.toggle('active');
    });

    // Закрываем выпадающий список при клике вне его
    document.addEventListener('click', function(event) {
      if (!navList.contains(event.target) && !navToggle.contains(event.target)) {
        navList.classList.remove('active');
      }
    });

    // Закрываем выпадающий список при клике на любую кнопку внутри него
    navList.addEventListener('click', function(event) {
      if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT') {
        navList.classList.remove('active');
      }
    });

    const fileMenuOp = document.getElementById('file-menu-op');
    const fileMenu = document.getElementById('file-menu');
    const fileMenuCtp = document.getElementById('file-menu-ctp');
    const fileViewer = document.getElementById('fileViewer');
    const fileFrame = document.getElementById('fileFrame');
    const fileViewerCtp = document.getElementById('fileViewerCtp');
    const fileFrameCtp = document.getElementById('fileFrameCtp');
    const fileViewerOp = document.getElementById('fileViewerOp');
    const fileFrameOp = document.getElementById('fileFrameOp');

    function closeAllMenus() {
      fileMenuOp.style.display = 'none';
      fileMenu.style.display = 'none';
      fileMenuCtp.style.display = 'none';
      fileViewerOp.style.display = 'none';
      fileViewer.style.display = 'none';
      fileViewerCtp.style.display = 'none';
      fileMenuOp.style.zIndex = 1;
      fileMenu.style.zIndex = 1;
      fileMenuCtp.style.zIndex = 1;
      fileViewerOp.style.zIndex = 1;
      fileViewer.style.zIndex = 1;
      fileViewerCtp.style.zIndex = 1;
    }

    document.getElementById('menu__op-button').addEventListener('click', function() {
      if (fileMenuOp.style.display === 'block') {
        closeAllMenus();
      } else {
        closeAllMenus();
        fileMenuOp.style.display = 'block';
        fileViewerOp.style.display = 'block';
        fileMenuOp.style.zIndex = 10;
        fileViewerOp.style.zIndex = 10;
      }
    });

    document.getElementById('menu-button').addEventListener('click', function() {
      if (fileMenu.style.display === 'block') {
        closeAllMenus();
      } else {
        closeAllMenus();
        fileMenu.style.display = 'block';
        fileMenu.style.zIndex = 10;
        fileViewer.style.zIndex = 10;
      }
    });

    document.getElementById('menu__ctp-button').addEventListener('click', function() {
      if (fileMenuCtp.style.display === 'block') {
        closeAllMenus();
      } else {
        closeAllMenus();
        fileMenuCtp.style.display = 'block';
        fileViewerCtp.style.display = 'block';
        fileMenuCtp.style.zIndex = 10;
        fileViewerCtp.style.zIndex = 10;
      }
    });

    document.querySelectorAll('.menu-link').forEach(item => {
      item.addEventListener('click', function() {
        const fileUrl = this.getAttribute('data-url');
        if (fileMenu.style.display === 'block') {
          fileFrame.src = fileUrl;
          fileViewer.style.display = 'block';
          fileViewer.style.zIndex = 10;
        } else if (fileMenuCtp.style.display === 'block') {
          fileFrameCtp.src = fileUrl;
          fileViewerCtp.style.display = 'block';
          fileViewerCtp.style.zIndex = 10;
        } else if (fileMenuOp.style.display === 'block') {
          fileFrameOp.src = fileUrl;
          fileViewerOp.style.display = 'block';
          fileViewerOp.style.zIndex = 10;
        }
      });
    });

    document.getElementById('nav-rp').addEventListener('click', function() {
      const fileUrl = this.getAttribute('data-url');
      closeAllMenus();
      fileFrame.src = fileUrl;
      fileViewer.style.display = 'block';
      fileViewer.style.zIndex = 10;
    });
  });
  
