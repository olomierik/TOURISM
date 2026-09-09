return (
    <main className="flex flex-col w-full pb-16">
      {/* 1. HERO & SEARCH */}
      <Hero frames={frames} destinations={destinations} categories={heroCategories} />

      {/* 2. INVENTORY (White Background) */}
      <div className="flex flex-col gap-y-16 md:gap-y-24 bg-white pt-8 pb-16">
        <FeaturedOperators locale={locale} />
        <PopularDestinations locale={locale} />
        <CategoryGrid locale={locale} categories={allCategories} />
      </div>

      {/* 3. DISCOVERY & CONTENT (Subtle Gray Background to break the rhythm) */}
      <div className="flex flex-col gap-y-16 md:gap-y-24 bg-zinc-50 py-16 md:py-24 border-y border-zinc-100">
        <EventsStrip locale={locale} />
        <LatestGuides locale={locale} />
        <NearMeTeaser locale={locale} />
      </div>

      {/* 4. CONVERSION & CALLS TO ACTION (White Background) */}
      <div className="flex flex-col gap-y-16 md:gap-y-24 bg-white py-16 md:py-24">
        <WhyExploreTanzania locale={locale} />
        <QuoteCta />
        <ListBusinessCta locale={locale} />
        <Newsletter locale={locale} />
      </div>
    </main>
  );
