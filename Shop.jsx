
import React, { useState, useRef, useEffect } from "react";
import Hero from "../Components/Hero/Hero";
import Popular from "../Components/Popular/Popular";
import Offers from "../Components/Offers/Offers";
import NewCollections from "../Components/NewCollections/NewCollections";
import NewsLetter from "../Components/NewsLetter/NewsLetter";
const Shop = () => {
    // This is a placeholder for the Shop component
    // You can add your shop content here

    return (
        <div>
              <Hero/>
              <Popular/>
                <Offers/>
                <NewCollections/> 
                <NewsLetter/>
        </div>
    );
}

export default Shop ;// This exports the Shop component for use in other parts of the application


