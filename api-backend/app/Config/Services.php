<?php

namespace Config;

use CodeIgniter\Config\BaseService;
use App\Libraries\AuthenticatedUser;

/**
 * Services Configuration file.
 *
 * Services are simply other classes/libraries that the system uses
 * to do its job. This is used by CodeIgniter to allow the core of the
 * framework to be swapped out easily without affecting the usage within
 * the rest of your application.
 *
 * This file holds any application-specific services, or service overrides
 * that you might need. An example has been included with the general
 * method format you should use for your service methods. For more examples,
 * see the core Services file at system/Config/Services.php.
 */
use App\Services\Storage\StorageServiceInterface;
use App\Services\Storage\BackblazeStorageService;

class Services extends BaseService
{
    /*
     * public static function example($getShared = true)
     * {
     *     if ($getShared) {
     *         return static::getSharedInstance('example');
     *     }
     *
     *     return new \CodeIgniter\Example();
     * }
     */
    public static function authenticatedUser(bool $getShared = true): AuthenticatedUser
    {
        if ($getShared) {
            return static::getSharedInstance('authenticatedUser');
        }

        return new AuthenticatedUser();
    }

    public static function storage(bool $getShared = true): StorageServiceInterface
    {
        if ($getShared) {
            return static::getSharedInstance('storage');
        }

        return new BackblazeStorageService();
    }
}
