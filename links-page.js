// Links Page Interactive Effects

document.addEventListener('DOMContentLoaded', () => {
    const linkButtons = document.querySelectorAll('.link-list');
    
    // Add hover sound effect and visual feedback
    linkButtons.forEach(button => {
        // Add ripple effect on click
        button.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            
            this.appendChild(ripple);
            
            // Remove the ripple element after animation completes
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
        
        // Add subtle animation on hover
        button.addEventListener('mouseenter', function() {
            this.classList.add('hover-active');
        });
        
        button.addEventListener('mouseleave', function() {
            this.classList.remove('hover-active');
        });
    });
    
    // Optional: Add a class to highlight new links
    // You can add the 'new' class to any link-list element you want to highlight
    // Example: document.querySelector('.link-list:nth-child(1)').classList.add('new');
});