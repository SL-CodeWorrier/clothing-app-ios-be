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


    // ===================================  ===================================



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

