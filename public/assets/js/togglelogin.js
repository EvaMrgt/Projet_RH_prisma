document.addEventListener('DOMContentLoaded', function () {
    const toggleButton = document.querySelector('.toggleLoginType');
    if (toggleButton) {
        toggleButton.addEventListener('click', function (event) {
            event.preventDefault();
            const currentPath = window.location.pathname;
            console.log(currentPath);
            
            if (currentPath.includes('/loginEmploye')) {
                window.location.href = '/login';
            } else if (currentPath.includes('/login')) {
                window.location.href = '/loginEmploye';
            }
        });
    }
});