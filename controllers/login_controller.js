var db = require('./../helpers/db_helpers')
var helper =  require('./../helpers/helpers')
var multiparty = require('multiparty')
var fs = require('fs');
var imageSavePath = "./public/img/"
var image_base_url = helper.ImagePath();



module.exports.controller = (app, io, socket_list ) => {

    const msg_success = "successfully";
    const msg_fail = "fail";
    const msg_invalidUser = "invalid username and password";
    const msg_already_register = "this email already register ";
    const msg_added_favorite = "add favorite list successfully";
    const msg_removed_favorite = "removed favorite list successfully";
    const msg_invalid_item = "invalid product item";
    const msg_add_to_item = "item added into cart successfully ";
    const msg_remove_to_cart = "item remove form cart successfully"


    // =================================== LOGIN ===================================

    app.post('/api/app/login', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;

        helper.CheckParameterValid(res, reqObj, ["email", "password", "dervice_token"], () => {

            var auth_token = helper.createRequestToken();
            db.query("UPDATE `user_detail` SET `auth_token`= ?,`dervice_token`=?,`modify_date`= NOW() WHERE `email` = ? AND `password` = ? AND `status` = ?", [auth_token, reqObj.dervice_token, reqObj.email, reqObj.password, "1"], (err, result) => {

                if (err) {
                    helper.ThrowHtmlError(err, res);
                    return
                }

                if (result.affectedRows > 0) {


                    db.query('SELECT `user_id`, `username`, `name`, `email`, `mobile`, `mobile_code`, `password`, `auth_token`, `status`, `created_date` FROM `user_detail` WHERE `email` = ? AND `password` = ? AND `status` = "1" ', [reqObj.email, reqObj.password], (err, result) => {

                        if (err) {
                            helper.ThrowHtmlError(err, res);
                            return
                        }

                        if (result.length > 0) {
                            res.json({ "status": "1", "payload": result[0], "message": msg_success })
                        } else {
                            res.json({ "status": "0", "message": msg_invalidUser })
                        }
                    })
                } else {
                    res.json({ "status": "0", "message": msg_invalidUser })
                }

            })
        })
    })

    // =================================== SIGNUP ===================================

    app.post('/api/app/sign_up', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;

        helper.CheckParameterValid(res, reqObj, ["username", "email", "password", "dervice_token"], () => {

            db.query('SELECT `user_id`, `status` FROM `user_detail` WHERE `email` = ? ', [reqObj.email], (err, result) => {

                if (err) {
                    helper.ThrowHtmlError(err, res);
                    return
                }

                if (result.length > 0) {
                    res.json({ "status": "1", "payload": result[0], "message": msg_already_register })
                } else {

                    var auth_token = helper.createRequestToken();
                    db.query("INSERT INTO `user_detail`( `username`, `email`, `password`, `auth_token`, `dervice_token`, `created_date`, `modify_date`) VALUES (?,?,?, ?,?, NOW(), NOW())", [reqObj.username, reqObj.email, reqObj.password, auth_token, reqObj.dervice_token], (err, result) => {
                        if (err) {
                            helper.ThrowHtmlError(err, res);
                            return
                        }

                        if (result) {
                            db.query('SELECT `user_id`, `username`, `name`, `email`, `mobile`, `mobile_code`, `password`, `auth_token`, `status`, `created_date`  FROM `user_detail` WHERE `user_id` = ? AND `status` = "1" ', [result.insertId], (err, result) => {

                                if (err) {
                                    helper.ThrowHtmlError(err, res);
                                    return
                                }

                                if (result.length > 0) {
                                    res.json({ "status": "1", "payload": result[0], "message": msg_success })
                                } else {
                                    res.json({ "status": "0", "message": msg_invalidUser })
                                }
                            })
                        } else {
                            res.json({ "status": "0", "message": msg_fail })
                        }
                    })

                }
            })
        })
    })



    // =================================== HOME ===================================

    app.post('/api/app/home', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;
        checkAccessToken(req.headers, res, (uObj) => {

            db.query("SELECT `od`.`price` as `offer_price`, `od`.`start_date`, `od`.`end_date`, `pd`.`prod_id`, `pd`.`cat_id`, `pd`.`brand_id`, `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`,(CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image`  , `cd`.`cat_name`,  `td`.`type_name`, ( CASE WHEN `fd`.`fav_id` IS NOT NULL THEN 1 ELSE 0 END ) AS `is_fav` FROM `offer_detail` AS `od` " +
                "INNER JOIN `product_detail` AS `pd` ON `pd`.`prod_id` = `od`.`prod_id` AND `pd`.`status` = ? " +
                "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
                "INNER JOIN `category_detail` AS `cd` ON `cd`.`cat_id` = `pd`.`cat_id` AND `cd`.`status` = 1 " +
                "LEFT JOIN  `favorite_detail` AS `fd` ON  `pd`.`prod_id` = `fd`.`prod_id` AND `fd`.`user_id` = ? AND `fd`.`status`=  1 " +
                "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` AND `td`.`status` = 1 " +
                "WHERE `od`.`status` = ? AND `od`.`start_date` <= NOW() AND `od`.`end_date` >= NOW() GROUP BY `pd`.`prod_id` ;" +

                "SELECT `pd`.`prod_id`, `pd`.`cat_id`, `pd`.`brand_id`, `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`, (CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image`, `cd`.`cat_name`,  `td`.`type_name`, ( CASE WHEN `fd`.`fav_id` IS NOT NULL THEN 1 ELSE 0 END ) AS `is_fav` FROM  `product_detail` AS `pd` " +
                "LEFT JOIN  `favorite_detail` AS `fd` ON  `pd`.`prod_id` = `fd`.`prod_id` AND `fd`.`user_id` = ? AND `fd`.`status`=  1 " +
                "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
                "INNER JOIN `category_detail` AS `cd` ON `cd`.`cat_id` = `pd`.`cat_id` AND `cd`.`status` = 1 " +

                "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` AND `td`.`status` = 1 " +
                "WHERE `pd`.`status` = ? AND `pd`.`cat_id` = ? GROUP BY `pd`.`prod_id` ;" +

                "SELECT `type_id`, `type_name`, (CASE WHEN `image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `image` ) ELSE '' END) AS `image` , `color` FROM `type_detail` WHERE `status` = ? ;" +

                "SELECT `pd`.`prod_id`, `pd`.`cat_id`, `pd`.`brand_id`, `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`, (CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image`, `cd`.`cat_name`,  `td`.`type_name`, ( CASE WHEN `fd`.`fav_id` IS NOT NULL THEN 1 ELSE 0 END ) AS `is_fav`  FROM  `product_detail` AS `pd` " +
                "LEFT JOIN  `favorite_detail` AS `fd` ON  `pd`.`prod_id` = `fd`.`prod_id` AND `fd`.`user_id` = ? AND `fd`.`status`=  1 " +
                "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
                "INNER JOIN `category_detail` AS `cd` ON `cd`.`cat_id` = `pd`.`cat_id` AND `cd`.`status` = 1 " +

                "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` AND `td`.`status` = 1 " +
                "WHERE `pd`.`status` = ? GROUP BY `pd`.`prod_id` ORDER BY `pd`.`prod_id` DESC LIMIT 4 ;", [

                "1", uObj.user_id, "1",
                uObj.user_id, "1", "1",
                "1",
                uObj.user_id, "1"
            ], (err, result) => {
                if (err) {
                    helper.ThrowHtmlError(err, res);
                    return;
                }

                res.json({
                    "status": "1", "payload": {
                        "offer_list": result[0],
                        "best_sell_list": result[1],
                        "type_list": result[2],
                        "list": result[3],
                    }, "message": msg_success
                })
            })

        }, "1")
    })



    // =================================== PRODUCT DETAIL ===================================


    app.post('/api/app/product_detail', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;
        checkAccessToken(req.headers, res, (uObj) => {
            helper.CheckParameterValid(res, reqObj, ["prod_id"], () => {

                getProductDetail(res, reqObj.prod_id, uObj.user_id);

            })
        }, "1")

    })

    

    // =================================== REMOVE FAVOURITE ===================================


    app.post('/api/app/add_remove_favorite', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.CheckParameterValid(res, reqObj, ["prod_id"], () => {
                db.query("SELECT `fav_id`, `prod_id` FROM `favorite_detail` WHERE `prod_id` = ? AND `user_id` = ? AND `status` = '1' ", [reqObj.prod_id, userObj.user_id], (err, result) => {
                    if (err) {
                        helper.ThrowHtmlError(err, res);
                        return
                    }

                    if (result.length > 0) {
                        // Already add Favorite List To Delete Fave
                        db.query("DELETE FROM `favorite_detail` WHERE `prod_id` = ? AND `user_id` = ? ", [reqObj.prod_id, userObj.user_id], (err, result) => {

                            if (err) {
                                helper.ThrowHtmlError(err, res);
                                return
                            } else {
                                res.json({
                                    "status": "1",
                                    "message": msg_removed_favorite
                                })
                            }
                        })

                    } else {
                        // Not Added  Favorite List TO Add
                        db.query("INSERT INTO `favorite_detail`(`prod_id`, `user_id`) VALUES (?,?) ", [
                            reqObj.prod_id, userObj.user_id
                        ], (err, result) => {
                            if (err) {
                                helper.ThrowHtmlError(err, res);
                                return
                            }

                            if (result) {
                                res.json({
                                    "status": "1",
                                    "message": msg_added_favorite
                                })
                            } else {
                                res.json({
                                    "status": "0",
                                    "message": msg_fail
                                })
                            }
                        })

                    }
                })
            })
        }, '1')
    })



    // =================================== FAVOURITE LIST===================================


    app.post('/api/app/favorite_list', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {

            db.query("SELECT `fd`.`fav_id`, `pd`.`prod_id`, `pd`.`cat_id`, `pd`.`brand_id`,  `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`, `pd`.`created_date`, `pd`.`modify_date`, `cd`.`cat_name`, IFNULL( `bd`.`brand_name`, '' ) AS `brand_name` , `td`.`type_name`, IFNULL(`od`.`price`, `pd`.`price` ) as `offer_price`, IFNULL(`od`.`start_date`,'') as `start_date`, IFNULL(`od`.`end_date`,'') as `end_date`, (CASE WHEN `od`.`offer_id` IS NOT NULL THEN 1 ELSE 0 END) AS `is_offer_active`, 1 AS `is_fav`, (CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image` FROM `favorite_detail` AS  `fd` " +
                "INNER JOIN  `product_detail` AS `pd` ON  `pd`.`prod_id` = `fd`.`prod_id` AND `pd`.`status` = 1 " +
                "INNER JOIN `category_detail` AS `cd` ON `pd`.`cat_id` = `cd`.`cat_id` " +
                "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
                "LEFT JOIN `brand_detail` AS `bd` ON `pd`.`brand_id` = `bd`.`brand_id` " +
                "LEFT JOIN `offer_detail` AS `od` ON `pd`.`prod_id` = `od`.`prod_id` AND `od`.`status` = 1 AND `od`.`start_date` <= NOW() AND `od`.`end_date` >= NOW() " +
                "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` " +
                " WHERE `fd`.`user_id` = ? AND `fd`.`status` = '1' GROUP BY `pd`.`prod_id` ", [userObj.user_id], (err, result) => {
                    if (err) {
                        helper.ThrowHtmlError(err, res);
                        return
                    }

                    res.json({
                        "status": "1",
                        "payload": result,
                        "message": msg_success
                    })

                })
        }, '1')
    })



    // =================================== EXPLORE CATEGORY LIST===================================


    app.post('/api/app/explore_category_list', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {

            db.query("SELECT `cat_id`, `cat_name`, (CASE WHEN `image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `image` ) ELSE '' END) AS `image` , `color` FROM `category_detail` WHERE `status` = 1 ", [], (err, result) => {
                if (err) {
                    helper.ThrowHtmlError(err, res);
                    return
                }

                res.json({
                    "status": "1",
                    "payload": result,
                    "message": msg_success
                })

            })
        }, '1')
    })


     // =================================== EXPLORE CATEGORY ITEM LIST===================================


     app.post('/api/app/explore_category_items_list', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body;

        checkAccessToken(req.headers, res, (userObj) => {
            helper.CheckParameterValid(res, reqObj, ["cat_id"], () => {


                db.query("SELECT `pd`.`prod_id`, `pd`.`cat_id`, `pd`.`brand_id`,  `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`, `pd`.`created_date`, `pd`.`modify_date`, `cd`.`cat_name`, IFNULL( `bd`.`brand_name`, '' ) AS `brand_name` , `td`.`type_name`, IFNULL(`od`.`price`, `pd`.`price` ) as `offer_price`, IFNULL(`od`.`start_date`,'') as `start_date`, IFNULL(`od`.`end_date`,'') as `end_date`, (CASE WHEN `od`.`offer_id` IS NOT NULL THEN 1 ELSE 0 END) AS `is_offer_active`, ( CASE WHEN `fd`.`fav_id` IS NOT NULL THEN 1 ELSE 0 END ) AS `is_fav`, (CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image` FROM  `product_detail` AS `pd` " +
                    "LEFT JOIN `favorite_detail` AS  `fd`  ON  `pd`.`prod_id` = `fd`.`prod_id` AND `fd`.`status` = 1 " +
                    "INNER JOIN `category_detail` AS `cd` ON `pd`.`cat_id` = `cd`.`cat_id` AND `pd`.`status` = 1 " +
                    "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
                    "LEFT JOIN `brand_detail` AS `bd` ON `pd`.`brand_id` = `bd`.`brand_id` " +
                    "LEFT JOIN `offer_detail` AS `od` ON `pd`.`prod_id` = `od`.`prod_id` AND `od`.`status` = 1 AND `od`.`start_date` <= NOW() AND `od`.`end_date` >= NOW() " +
                    "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` " +
                    " WHERE `cd`.`cat_id` = ? AND `cd`.`status` = '1' GROUP BY `pd`.`prod_id`  ", [reqObj.cat_id], (err, result) => {
                        if (err) {
                            helper.ThrowHtmlError(err, res);
                            return
                        }

                        res.json({
                            "status": "1",
                            "payload": result,
                            "message": msg_success
                        })

                    })
            })
        }, '1')
    })



    // =================================== ADD TO CART ===================================

    app.post('/api/app/add_to_cart', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body

        checkAccessToken(req.headers, res, (userObj) => {
            helper.CheckParameterValid(res, reqObj, ["prod_id", "qty"], () => {

                db.query("Select `prod_id` FROM `product_detail` WHERE  `prod_id` = ? AND `status` = 1 ", [reqObj.prod_id], (err, result) => {
                    if (err) {
                        helper.ThrowHtmlError(err, res)
                        return;
                    }

                    if (result.length > 0) {
                        //Valid Item

                        db.query("INSERT INTO `cart_detail`(`user_id`, `prod_id`, `qty`) VALUES (?,?,?) ", [userObj.user_id, reqObj.prod_id, reqObj.qty], (err, result) => {
                            if (err) {
                                helper.ThrowHtmlError(err, res)
                                return
                            }

                            if (result) {
                                res.json({
                                    "status": "1",
                                    "message": msg_add_to_item
                                })
                            } else {
                                res.json({
                                    "status": "0",
                                    "message": msg_fail
                                })
                            }
                        })
                    } else {
                        //Invalid Item
                        res.json({
                            "status": "0",
                            "message": msg_invalid_item
                        })
                    }
                })
            })
        })
    })


    // =================================== UPDATE CART ===================================

    app.post('/api/app/update_cart', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body

        checkAccessToken(req.headers, res, (userObj) => {
            helper.CheckParameterValid(res, reqObj, ["cart_id", "prod_id", "new_qty"], () => {

                // Valid
                var status = "1"

                if (reqObj.new_qty == "0") {
                    status = "2"
                }
                db.query("UPDATE `cart_detail` SET `qty`= ? , `status`= ?, `modify_date`= NOW() WHERE `cart_id` = ? AND `prod_id` = ? AND `user_id` = ? AND `status` = ? ", [reqObj.new_qty, status, reqObj.cart_id, reqObj.prod_id, userObj.user_id, "1"], (err, result) => {

                    if (err) {
                        helper.ThrowHtmlError(err, res)
                        return
                    }

                    if (result.affectedRows > 0) {
                        res.json({
                            "status": "1",
                            "message": msg_success
                        })
                    } else {
                        res.json({
                            "status": "0",
                            "message": msg_fail
                        })
                    }
                })

            })
        })
    })


    // =================================== REMOVE CART ===================================

    app.post('/api/app/remove_cart', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body

        checkAccessToken(req.headers, res, (userObj) => {
            helper.CheckParameterValid(res, reqObj, ["cart_id", "prod_id"], () => {


                db.query("UPDATE `cart_detail` SET `status`= '2', `modify_date`= NOW() WHERE `cart_id` = ? AND `prod_id` = ? AND  `user_id` = ? AND  `status` = ? ", [reqObj.cart_id, reqObj.prod_id, userObj.user_id, "1"], (err, result) => {

                    if (err) {
                        helper.ThrowHtmlError(err, res)
                        return
                    }

                    if (result.affectedRows > 0) {
                        res.json({
                            "status": "1",
                            "message": msg_remove_to_cart
                        })
                    } else {
                        res.json({
                            "status": "0",
                            "message": msg_fail
                        })
                    }
                })

            })
        })
    })


    // =================================== CART LIST ===================================

    app.post('/api/app/cart_list', (req, res) => {
        helper.Dlog(req.body)
        var reqObj = req.body

        checkAccessToken(req.headers, res, (userObj) => {
            getUserCart(res, userObj.user_id, (result, total) => {

                res.json({
                    "status": "1",
                    "payload": result,
                    "total": total.toFixed(2),
                    "message": msg_success
                })
                

            })
        })
    })



    // ==================================== >>> FUNCTION


    function getProductDetail(res, prod_id, user_id) {
        db.query("SELECT `pd`.`prod_id`, `pd`.`cat_id`, `pd`.`brand_id`, `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`, `pd`.`created_date`, `pd`.`modify_date`, `cd`.`cat_name`, ( CASE WHEN `fd`.`fav_id` IS NOT NULL THEN 1 ELSE 0 END ) AS `is_fav` , IFNULL( `bd`.`brand_name`, '' ) AS `brand_name` , `td`.`type_name`, IFNULL(`od`.`price`, `pd`.`price` ) as `offer_price`, (CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image`, IFNULL(`od`.`start_date`,'') as `start_date`, IFNULL(`od`.`end_date`,'') as `end_date`, (CASE WHEN `od`.`offer_id` IS NOT NULL THEN 1 ELSE 0 END) AS `is_offer_active` FROM `product_detail` AS  `pd` " +
            "INNER JOIN `category_detail` AS `cd` ON `pd`.`cat_id` = `cd`.`cat_id` " +
            "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
            "LEFT JOIN  `favorite_detail` AS `fd` ON  `pd`.`prod_id` = `fd`.`prod_id` AND `fd`.`user_id` = ? AND `fd`.`status`=  1 " +
            "LEFT JOIN `brand_detail` AS `bd` ON `pd`.`brand_id` = `bd`.`brand_id` " +
            "LEFT JOIN `offer_detail` AS `od` ON `pd`.`prod_id` = `od`.`prod_id` AND `od`.`status` = 1 AND `od`.`start_date` <= NOW() AND `od`.`end_date` >= NOW() " +
            "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` " +
            " WHERE `pd`.`status` = ? AND `pd`.`prod_id` = ? GROUP BY `pd`.`prod_id`; " +

            // " SELECT `nutrition_id`, `prod_id`, `nutrition_name`, `nutrition_value` FROM `nutrition_detail` WHERE `prod_id` = ? AND `status` = ? ORDER BY `nutrition_name`;" +

            "SELECT `img_id`, `prod_id`, (CASE WHEN `image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `image` ) ELSE '' END) AS `image`  FROM `image_detail` WHERE `prod_id` = ? AND `status` = ? ", [


            user_id, "1", prod_id, prod_id, "1", prod_id, "1",

        ], (err, result) => {

            if (err) {
                helper.ThrowHtmlError(err, res);
                return;
            }

            // result = result.replace_null()

            // helper.Dlog(result);

            if (result[0].length > 0) {

                // result[0][0].nutrition_list = result[1];
                result[0][0].images = result[2];


                res.json({
                    "status": "1", "payload": result[0][0]
                });
            } else {
                res.json({ "status": "0", "message": "invalid item" })
            }



        })
    }


    function getUserCart(res, user_id, callback) {
        db.query(
            "SELECT `ucd`.`cart_id`, `ucd`.`user_id`, `ucd`.`prod_id`, `ucd`.`qty`, `pd`.`cat_id`, `pd`.`brand_id`, `pd`.`type_id`, `pd`.`name`, `pd`.`detail`, `pd`.`unit_value`, `pd`.`price`, `pd`.`created_date`, `pd`.`modify_date`, `cd`.`cat_name`, ( CASE WHEN `fd`.`fav_id` IS NOT NULL THEN 1 ELSE 0 END ) AS `is_fav` , IFNULL( `bd`.`brand_name`, '' ) AS `brand_name` , `td`.`type_name`, IFNULL(`od`.`price`, `pd`.`price` ) as `offer_price`, IFNULL(`od`.`start_date`,'') as `start_date`, IFNULL(`od`.`end_date`,'') as `end_date`, (CASE WHEN `od`.`offer_id` IS NOT NULL THEN 1 ELSE 0 END) AS `is_offer_active`, (CASE WHEN `imd`.`image` != '' THEN  CONCAT( '" + image_base_url + "' ,'', `imd`.`image` ) ELSE '' END) AS `image`, (CASE WHEN `od`.`price` IS NULL THEN `pd`.`price` ELSE `od`.`price` END) as `item_price`, ( (CASE WHEN `od`.`price` IS NULL THEN `pd`.`price` ELSE `od`.`price` END) * `ucd`.`qty`)  AS `total_price` FROM `cart_detail` AS `ucd` " +
            "INNER JOIN `product_detail` AS `pd` ON `pd`.`prod_id` = `ucd`.`prod_id` AND `pd`.`status` = 1  " +
            "INNER JOIN `category_detail` AS `cd` ON `pd`.`cat_id` = `cd`.`cat_id` " +
            "LEFT JOIN  `favorite_detail` AS `fd` ON  `pd`.`prod_id` = `fd`.`prod_id` AND `fd`.`user_id` = ? AND `fd`.`status`=  1 " +
            "LEFT JOIN `brand_detail` AS `bd` ON `pd`.`brand_id` = `bd`.`brand_id` " +
            "LEFT JOIN `offer_detail` AS `od` ON `pd`.`prod_id` = `od`.`prod_id` AND `od`.`status` = 1 AND `od`.`start_date` <= NOW() AND `od`.`end_date` >= NOW() " +
            "INNER JOIN `image_detail` AS `imd` ON `pd`.`prod_id` = `imd`.`prod_id` AND `imd`.`status` = 1 " +
            "INNER JOIN `type_detail` AS `td` ON `pd`.`type_id` = `td`.`type_id` " +
            "WHERE `ucd`.`user_id` = ? AND `ucd`.`status` = ? GROUP BY `ucd`.`cart_id`, `pd`.`prod_id` ", [user_id, user_id, "1"], (err, result) => {
                if (err) {
                    helper.ThrowHtmlError(err, res)
                    return
                }

                var total = result.map((cObj) => {
                    return cObj.total_price
                }).reduce((patSum, a) => patSum + a, 0)


                return callback(result, total)
            })
    }



 
}

// =================================== ACCESS TOKEN ===================================

function checkAccessToken(headerObj, res, callback, require_type = "") {
    helper.Dlog(headerObj.access_token);
    helper.CheckParameterValid(res, headerObj, ["access_token"], () => {
        db.query("SELECT `user_id`, `username`, `user_type`, `name`, `email`, `mobile`, `mobile_code`,  `auth_token`, `dervice_token`, `status` FROM `user_detail` WHERE `auth_token` = ? AND `status` = ? ", [headerObj.access_token, "1"], (err, result) => {
            if (err) {
                helper.ThrowHtmlError(err, res);
                return
            }

            helper.Dlog(result);

            if (result.length > 0) {
                if (require_type != "") {
                    if (require_type == result[0].user_type) {
                        return callback(result[0]);
                    } else {
                        res.json({ "status": "0", "code": "404", "message": "Access denied. Unauthorized user access." })
                    }
                } else {
                    return callback(result[0]);
                }
            } else {
                res.json({ "status": "0", "code": "404", "message": "Access denied. Unauthorized user access." })
            }
        })
    })
}

