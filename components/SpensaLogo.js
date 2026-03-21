function SpensaLogo({ size = 'md', showText = true }) {
  try {
    const sizes = {
      sm: { container: 'w-10 h-10', text: 'text-lg' },
      md: { container: 'w-16 h-16', text: 'text-2xl' },
      lg: { container: 'w-20 h-20', text: 'text-3xl' },
      xl: { container: 'w-30 h-30', text: 'text-5xl' }
    };

    const currentSize = sizes[size] || sizes.md;

    return (
      <div className="flex items-center gap-3" data-name="spensa-logo" data-file="components/SpensaLogo.js">
        <img 
          src="https://app.trickle.so/storage/public/images/usr_173f09e758000001/227f35e7-5ab9-4689-9b04-01b138000659.png" 
          alt="Spensa Logo" 
          className={`${currentSize.container} object-contain`}
        />
        {showText && (
          <span className={`${currentSize.text} font-bold text-[var(--primary-color)]`}>Spensa</span>
        )}
      </div>
    );
  } catch (error) {
    console.error('SpensaLogo component error:', error);
    return null;
  }
}
