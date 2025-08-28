

import React, { useState, useRef, useEffect, useContext } from "react";
import "./CSS/ShopCategory.css";
import { ShopContext } from "../Context/ShopContext";
import App from "../App";
import dropdown_icon from "../Components/Assets/dropdown_icon.png";
import Item from "../Components/Item/Item";
import all_product from "../Components/Assets/all_product.js";
const ShopCategory = (props) => {
    // This is a placeholder for the ShopCategoryCategory component
    // You can add your ShopCategoryCategory content here
    const{all_product}=useContext(ShopContext);
    
    return (
        <div className="shop-category"> 
        <img src={props.banner} alt=""/>
        <div className="shopcategory-indexSort">
            <p>
                <span>Showing 1-12</span> out od 36 products
            </p>
            <div className="shopcategory-sort">
            Sort by <img src={dropdown_icon} alt="" />
            </div>
        </div>
        <div className="shopcategory-products">
            {all_product.map((item,index)=>{
               if(props.category===item.category){
                    return <Item key={index} id={item.id} image={item.image} name={item.name} newprice={item.newprice} oldprice={item.oldprice}  />
               }
               else{
                return null;
               }
            })}
</div>
        </div>
    )
};

export default ShopCategory; // This exports the ShopCategoryCategory component for use in other parts of the application 

