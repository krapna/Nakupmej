document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        var username = document.getElementById('username').value;
        var password = document.getElementById('password').value;

        if (username === 'mej' && password === 'cr7') {
            window.location.href = 'Strana1.html';
        } else {
            alert('Nesprávné přihlašovací údaje. Zkuste to znovu. Fandíš snad Messimu??');
        }
    });
});

