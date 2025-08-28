useEffect(() => {
  const scrollContainer = scrollRef.current;
  let scrollAmount = 0;
  const scrollStep = 1;
  const interval = setInterval(() => {
    if (!scrollContainer) return;
    scrollAmount += scrollStep;
    if (scrollAmount >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
      scrollAmount = 0;
    }
    scrollContainer.scrollTo({ left: scrollAmount, behavior: "smooth" });
  }, 50);

  return () => clearInterval(interval); // تنظيف عند الخروج
}, []);
